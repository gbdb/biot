/**
 * Galerie / carousel de photos réutilisable (espèce, spécimen, observation).
 * Affiche des vignettes en défilement horizontal et un modal plein écran avec
 * navigation prev/next, attribution et lien vers l'événement si présent.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  useWindowDimensions,
  Linking,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PhotoEventSummary } from '@/types/api';
import { EVENT_TYPE_LABELS } from '@/types/api';

export interface PhotoCarouselItem {
  id: number | string;
  image_url: string;
  source_author?: string | null;
  source_url?: string | null;
  /** Si présent, affiche un badge "événement" et un lien vers l'événement. */
  event?: PhotoEventSummary | null;
  /** Données optionnelles pour actions spécifiques (ex: specimenId + photoId pour Définir par défaut / Supprimer). */
  meta?: { photoId?: number; specimenId?: number };
}

interface PhotoCarouselProps {
  /** Liste des photos à afficher. */
  items: PhotoCarouselItem[];
  /** Taille des vignettes (côté carré ou hauteur si aspect). */
  thumbnailSize?: number;
  /** Afficher un badge événement sur les vignettes. */
  showEventBadge?: boolean;
  /** Callback quand l'utilisateur choisit d'ouvrir un événement (specimenId, eventId). */
  onOpenEvent?: (eventId: number) => void;
  /** Contenu optionnel à afficher sous les vignettes (ex: bouton Ajouter une photo). */
  extraContent?: React.ReactNode;
  /** Actions optionnelles dans le fullscreen (ex: Définir par défaut, Supprimer pour un spécimen). */
  renderFullscreenActions?: (item: PhotoCarouselItem, close: () => void) => React.ReactNode;
}

const THUMB_SIZE = 120;
const THUMB_ASPECT = 1;

export function PhotoCarousel({
  items,
  thumbnailSize = THUMB_SIZE,
  showEventBadge = false,
  onOpenEvent,
  extraContent,
  renderFullscreenActions,
}: PhotoCarouselProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const flatListRef = useRef<FlatList<PhotoCarouselItem>>(null);

  useEffect(() => {
    if (fullscreenIndex === null || items.length === 0) return;
    flatListRef.current?.scrollToOffset({
      offset: fullscreenIndex * screenWidth,
      animated: true,
    });
  }, [fullscreenIndex, screenWidth, items.length]);

  const openAt = useCallback((index: number) => {
    setFullscreenIndex(index);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenIndex(null);
  }, []);

  const goPrev = useCallback(() => {
    if (fullscreenIndex === null || items.length === 0) return;
    setFullscreenIndex((prev) => (prev! <= 0 ? items.length - 1 : prev! - 1));
  }, [fullscreenIndex, items.length]);

  const goNext = useCallback(() => {
    if (fullscreenIndex === null || items.length === 0) return;
    setFullscreenIndex((prev) => (prev! >= items.length - 1 ? 0 : prev! + 1));
  }, [fullscreenIndex, items.length]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.x;
      const index = Math.round(offset / screenWidth);
      if (index >= 0 && index < items.length && index !== fullscreenIndex) {
        setFullscreenIndex(index);
      }
    },
    [items.length, screenWidth, fullscreenIndex]
  );

  if (items.length === 0 && !extraContent) {
    return null;
  }

  const currentItem = fullscreenIndex != null && items[fullscreenIndex] ? items[fullscreenIndex] : null;

  return (
    <View style={styles.wrapper}>
      {items.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbList}
        >
          {items.map((item, index) => (
            <TouchableOpacity
              key={String(item.id)}
              style={[styles.thumbWrap, { width: thumbnailSize, height: thumbnailSize * THUMB_ASPECT }]}
              onPress={() => openAt(index)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: item.image_url }}
                style={[styles.thumb, { width: thumbnailSize, height: thumbnailSize * THUMB_ASPECT }]}
                resizeMode="cover"
              />
              {showEventBadge && item.event && (
                <View style={styles.eventBadge}>
                  <Ionicons name="calendar" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {extraContent}

      <Modal
        visible={fullscreenIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={closeFullscreen}
      >
        <View style={[styles.fullscreenOverlay, { minHeight: screenHeight }]}>
          {fullscreenIndex !== null && items.length > 0 && (
            <>
              <FlatList
                ref={flatListRef}
                data={items}
                keyExtractor={(item) => String(item.id)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={fullscreenIndex}
                getItemLayout={(_, index) => ({
                  length: screenWidth,
                  offset: screenWidth * index,
                  index,
                })}
                onMomentumScrollEnd={handleScroll}
                renderItem={({ item }) => (
                  <View style={[styles.fullscreenSlide, { width: screenWidth, height: screenHeight }]}>
                    <Image
                      source={{ uri: item.image_url }}
                      style={[styles.fullscreenImage, { width: screenWidth, height: screenHeight }]}
                      resizeMode="contain"
                    />
                  </View>
                )}
              />
              {items.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.navButton, styles.navPrev]}
                    onPress={goPrev}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  >
                    <Ionicons name="chevron-back" size={36} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.navButton, styles.navNext]}
                    onPress={goNext}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  >
                    <Ionicons name="chevron-forward" size={36} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.counter}>
                    <Text style={styles.counterText}>
                      {fullscreenIndex + 1} / {items.length}
                    </Text>
                  </View>
                </>
              )}
              {currentItem?.source_author && (
                <View style={styles.attribution}>
                  <Text style={styles.attributionText} numberOfLines={2}>
                    {currentItem.source_author}
                  </Text>
                  {currentItem.source_url && (
                    <TouchableOpacity onPress={() => Linking.openURL(currentItem.source_url!)}>
                      <Text style={styles.attributionLink}>Source</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {currentItem?.event && (
                <View style={styles.eventLinkBar}>
                  <Text style={styles.eventLinkLabel}>
                    {EVENT_TYPE_LABELS[currentItem.event.type_event as keyof typeof EVENT_TYPE_LABELS] ?? currentItem.event.type_event} — {currentItem.event.date}
                  </Text>
                  {onOpenEvent && (
                    <TouchableOpacity
                      style={styles.eventLinkButton}
                      onPress={() => {
                        closeFullscreen();
                        onOpenEvent(currentItem.event!.id);
                      }}
                    >
                      <Text style={styles.eventLinkButtonText}>Voir l&apos;événement</Text>
                      <Ionicons name="open-outline" size={18} color="#1a3c27" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {renderFullscreenActions && currentItem && (
                <View style={styles.fullscreenActionsBar}>
                  {renderFullscreenActions(currentItem, closeFullscreen)}
                </View>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeFullscreen}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 4,
  },
  thumbList: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  thumbWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  thumb: {
    borderRadius: 12,
  },
  eventBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(26,60,39,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenSlide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    backgroundColor: 'transparent',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navPrev: { left: 16 },
  navNext: { right: 16 },
  counter: {
    position: 'absolute',
    top: 52,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
  },
  counterText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  attribution: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  attributionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  attributionLink: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  eventLinkBar: {
    position: 'absolute',
    bottom: 52,
    left: 20,
    right: 20,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(26,60,39,0.9)',
    borderRadius: 12,
  },
  eventLinkLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  eventLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  eventLinkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a3c27',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fullscreenActionsBar: {
    position: 'absolute',
    bottom: 52,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 24,
  },
});
