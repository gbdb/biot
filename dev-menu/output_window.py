"""
Cocoa (AppKit) output window for dev-menu: scrollable log, Copy last / Copy all.
All UI runs on the main (Cocoa/rumps) thread to avoid GIL/threading crashes.
The main thread should call drain_queue() periodically (e.g. via rumps timer).
"""

import queue

import objc
from AppKit import (
    NSApp,
    NSBackingStoreBuffered,
    NSBezelStyleRounded,
    NSClosableWindowMask,
    NSFont,
    NSMakeRect,
    NSMiniaturizableWindowMask,
    NSPanel,
    NSPasteboard,
    NSScrollView,
    NSTitledWindowMask,
    NSTextView,
    NSViewWidthSizable,
    NSViewHeightSizable,
)
from Foundation import NSObject


class _CocoaOutputWindow(NSObject):
    """Cocoa panel with scrollable log and Copy buttons. Main-thread only."""

    def init(self):
        self = objc.super(_CocoaOutputWindow, self).init()
        if self is None:
            return None
        self._line_queue = None
        self._get_all_fn = None
        self._get_last_fn = None
        self._panel = None
        self._text_view = None
        return self

    def set_line_queue(self, q):
        self._line_queue = q

    def set_getters(self, get_all_fn, get_last_fn):
        self._get_all_fn = get_all_fn
        self._get_last_fn = get_last_fn

    def _ensure_window(self, get_all_fn, get_last_fn):
        if self._panel is not None:
            return
        self._get_all_fn = self._get_all_fn or get_all_fn
        self._get_last_fn = self._get_last_fn or get_last_fn

        # Panel
        content_rect = NSMakeRect(100, 350, 700, 450)
        style = NSTitledWindowMask | NSClosableWindowMask | NSMiniaturizableWindowMask
        self._panel = NSPanel.alloc().initWithContentRect_styleMask_backing_defer_(
            content_rect, style, NSBackingStoreBuffered, False
        )
        self._panel.setTitle_("Jardin Biot — Dev output")
        self._panel.setMinSize_((400, 250))

        content = self._panel.contentView()
        w, h = 700, 450  # match content_rect

        # ScrollView + TextView
        scroll_rect = NSMakeRect(8, 44, w - 16, h - 52)
        scroll_view = NSScrollView.alloc().initWithFrame_(scroll_rect)
        scroll_view.setHasVerticalScroller_(True)
        scroll_view.setHasHorizontalScroller_(False)
        scroll_view.setAutoresizingMask_(NSViewWidthSizable | NSViewHeightSizable)
        scroll_view.setBorderType_(1)  # NSBezelBorder

        doc_rect = NSMakeRect(0, 0, w - 32, 1e6)
        self._text_view = NSTextView.alloc().initWithFrame_(doc_rect)
        self._text_view.setEditable_(False)
        self._text_view.setSelectable_(True)
        self._text_view.setVerticallyResizable_(True)
        self._text_view.setHorizontallyResizable_(False)
        self._text_view.setFont_(NSFont.fontWithName_size_("Menlo", 11))
        self._text_view.setMinSize_((0, 0))
        self._text_view.setMaxSize_((1e7, 1e7))
        tc = self._text_view.textContainer()
        tc.setContainerSize_((w - 32, 1e7))
        tc.setWidthTracksTextView_(True)

        scroll_view.setDocumentView_(self._text_view)
        content.addSubview_(scroll_view)

        # Buttons (actions are selectors: copyLastOutput:, copyAllOutput:)
        btn_y = 10
        copy_last = self._make_button("Copy last output", 8, btn_y, "copyLastOutput:")
        content.addSubview_(copy_last)
        copy_all = self._make_button("Copy all", 180, btn_y, "copyAllOutput:")
        content.addSubview_(copy_all)

        # Initial content from buffer
        if self._get_all_fn:
            try:
                text = self._get_all_fn()
                if text:
                    self._text_view.setString_(text)
                    self._text_view.scrollToEndOfDocument_(None)
            except Exception:
                pass

    def _make_button(self, title, x, y, action_selector):
        from AppKit import NSButton
        btn = NSButton.alloc().initWithFrame_(NSMakeRect(x, y, 160, 28))
        btn.setTitle_(title)
        btn.setBezelStyle_(NSBezelStyleRounded)
        btn.setTarget_(self)
        btn.setAction_(action_selector)
        return btn

    def copyLastOutput_(self, sender):
        if self._get_last_fn:
            try:
                data = self._get_last_fn()
                if data:
                    pb = NSPasteboard.generalPasteboard()
                    pb.clearContents()
                    pb.setString_forType_(data, "public.plain-text")
            except Exception:
                pass

    def copyAllOutput_(self, sender):
        if self._get_all_fn:
            try:
                data = self._get_all_fn()
                if data:
                    pb = NSPasteboard.generalPasteboard()
                    pb.clearContents()
                    pb.setString_forType_(data, "public.plain-text")
            except Exception:
                pass

    def drain_queue(self):
        """Call from main thread (e.g. rumps timer). Drains line queue into the text view."""
        if self._line_queue is None or self._text_view is None:
            return
        try:
            while True:
                line = self._line_queue.get_nowait()
                self._text_view.setEditable_(True)
                self._text_view.insertText_(line)
                self._text_view.setEditable_(False)
                self._text_view.scrollToEndOfDocument_(None)
        except queue.Empty:
            pass

    def show(self, get_all_fn=None, get_last_fn=None):
        """Show the window. Call from main thread."""
        try:
            self._ensure_window(get_all_fn, get_last_fn)
            if self._panel:
                NSApp.activateIgnoringOtherApps_(True)
                self._panel.makeKeyAndOrderFront_(None)
        except Exception as e:
            # Avoid silent failure; rumps may not show traceback
            import sys
            sys.stderr.write(f"OutputWindow show error: {e}\n")
            try:
                rumps = __import__("rumps")
                rumps.notification("Biot", "Could not open output window", str(e))
            except Exception:
                pass


class OutputWindow:
    """Python wrapper: same API as before (line_queue, get_all_fn, get_last_fn)."""

    def __init__(self, line_queue, get_all_fn, get_last_fn):
        self._line_queue = line_queue
        self._get_all_fn = get_all_fn
        self._get_last_fn = get_last_fn
        self._cocoa = _CocoaOutputWindow.alloc().init()
        self._cocoa.set_line_queue(line_queue)
        self._cocoa.set_getters(get_all_fn, get_last_fn)

    def show(self):
        self._cocoa.show(self._get_all_fn, self._get_last_fn)

    def drain_queue(self):
        self._cocoa.drain_queue()
