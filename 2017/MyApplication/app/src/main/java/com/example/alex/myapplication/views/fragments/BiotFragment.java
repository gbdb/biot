package com.example.alex.myapplication.views.fragments;

import android.support.v4.app.Fragment;
import android.widget.BaseAdapter;

import com.example.alex.myapplication.communication.BiotDataCallback;
import com.example.alex.myapplication.communication.Operation;
import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.parsers.BiotEntityParser;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Vector;


public abstract class BiotFragment extends Fragment {
    public BiotFragment() {}

    protected Operation operation;
    protected List<Biot> biotData = new ArrayList<>();
    protected BaseAdapter adapter;
    protected BiotEntityParser parser;

    @Override
    public void onResume() {
        super.onResume();
        refresh();
    }

    protected void refresh() {
        operation.fetchAll(new BiotDataCallback() {
            @Override
            public void onDataReceived(Object object) {
                beforeDataLoadedHook();
                biotData.clear();
                biotData.addAll((Collection<? extends Biot>) object);
                onDataLoadedHook();
            }
        });
    }

    protected abstract void onDataLoadedHook();
    protected abstract void beforeDataLoadedHook();
}