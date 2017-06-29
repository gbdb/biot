package com.example.alex.myapplication.views.fragments;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.preference.PreferenceManager;
import android.support.v4.app.Fragment;
import android.support.v4.widget.SwipeRefreshLayout;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.example.alex.myapplication.adapters.AlertItemAdapter;
import com.example.alex.myapplication.R;
import com.example.alex.myapplication.communication.BaseBiotDAO;
import com.example.alex.myapplication.communication.BiotDataCallback;
import com.example.alex.myapplication.models.Alert;
import com.example.alex.myapplication.parsers.AlertParser;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class AlertsFragment extends Fragment {

    public AlertsFragment() {}

    private RecyclerView recyclerView;
    private RecyclerView.Adapter adapter;
    private RecyclerView.LayoutManager layoutManager;
    private List<Alert> alerts;
    private BaseBiotDAO alertsDAO;
    private SwipeRefreshLayout swipeRefreshLayout;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_alerts, container, false);
        recyclerView = (RecyclerView)rootView.findViewById(R.id.alertsRecyclerView);

        swipeRefreshLayout = (SwipeRefreshLayout)rootView.findViewById(R.id.swipeRefresh);
        swipeRefreshLayout.setOnRefreshListener(new SwipeRefreshLayout.OnRefreshListener() {
            @Override
            public void onRefresh() {
                refreshView();
            }
        });

        alerts = new ArrayList<>();

        adapter = new AlertItemAdapter(alerts);
        layoutManager = new LinearLayoutManager(getActivity());
        recyclerView.setLayoutManager(layoutManager);
        recyclerView.setAdapter(adapter);

        return rootView;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        SharedPreferences sharedPref =
                PreferenceManager.getDefaultSharedPreferences(getActivity());
        String ip =
                sharedPref.getString("ip_pref", getActivity().getString(R.string.default_ip));
        alertsDAO = new BaseBiotDAO(ip, "alerts", getContext());
    }

    @Override
    public void onResume() {
        super.onResume();
        refreshView();
    }

    private void refreshView() {
        alertsDAO.fetchAll(new BiotDataCallback() {
            @Override
            public void onDataReceived(Object object) {
                alerts.clear();
                alerts.addAll((Collection<? extends Alert>) object);
                adapter.notifyDataSetChanged();
                swipeRefreshLayout.setRefreshing(false);
            }
        }, new AlertParser());
    }
}