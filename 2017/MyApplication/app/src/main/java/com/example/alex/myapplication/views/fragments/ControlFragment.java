package com.example.alex.myapplication.views.fragments;

import android.os.Bundle;
import android.support.v4.widget.SwipeRefreshLayout;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ListView;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.parsers.RelayParser;
import com.example.alex.myapplication.views.adapters.SwitchItemAdapter;
import com.example.alex.myapplication.communication.daos.BaseBiotDAO;


public class ControlFragment extends BiotFragment {

    public ControlFragment() {}

    private ListView listView;
    private SwipeRefreshLayout swipeRefreshLayout;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        adapter = new SwitchItemAdapter(getActivity(), biotData);
        operation = new BaseBiotDAO("relays", getContext());
        parser = new RelayParser();
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_control, container, false);

        swipeRefreshLayout = (SwipeRefreshLayout)rootView.findViewById(R.id.swipeRefresh);
        swipeRefreshLayout.setOnRefreshListener(new SwipeRefreshLayout.OnRefreshListener() {
            @Override
            public void onRefresh() {
                refresh();
            }
        });

        listView = (ListView)rootView.findViewById(R.id.pump_listView);
        Log.i("ControlFragment", listView.toString());
        Log.i("ControlFragment", biotData.toString());
        listView.setAdapter(adapter);
        return rootView;
    }

    @Override
    public void onResume() {
        super.onResume();
        refresh();
    }

    @Override
    protected void onDataLoadedHook() {
        adapter.notifyDataSetChanged();
        swipeRefreshLayout.setRefreshing(false);
    }
}