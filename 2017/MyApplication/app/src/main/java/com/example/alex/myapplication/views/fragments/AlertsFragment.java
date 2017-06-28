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
import com.example.alex.myapplication.communication.AlertDAO;
import com.example.alex.myapplication.communication.AlertListener;
import com.example.alex.myapplication.models.Alert;

import java.util.ArrayList;
import java.util.List;

public class AlertsFragment extends Fragment implements AlertListener {

    public AlertsFragment() {}

    private RecyclerView recyclerView;
    private RecyclerView.Adapter adapter;
    private RecyclerView.LayoutManager layoutManager;
    private List<Alert> alerts;
    private AlertDAO alertDAO;
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
                alertDAO.fetchAll();
                swipeRefreshLayout.setRefreshing(false);
            }
        });


        alerts = new ArrayList<>();
        SharedPreferences sharedPref =
                PreferenceManager.getDefaultSharedPreferences(getActivity());
        String ip =
                sharedPref.getString("ip_pref", getActivity().getString(R.string.default_ip));

        alertDAO = new AlertDAO(ip, getContext());
        alertDAO.setAlertListener(this);
        alertDAO.fetchAll();


        adapter = new AlertItemAdapter(alerts, getActivity());
        layoutManager = new LinearLayoutManager(getActivity());
        recyclerView.setLayoutManager(layoutManager);
        recyclerView.setAdapter(adapter);

        return rootView;
    }

    @Override
    public void onResume() {
        super.onResume();

        //alertDAO.fetchAll();
    }

    @Override
    public void onNewAlert(Alert alert) {
        alerts.add(alert);
        adapter.notifyDataSetChanged();
    }
}