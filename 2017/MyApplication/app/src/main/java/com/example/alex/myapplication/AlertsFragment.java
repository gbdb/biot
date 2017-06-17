package com.example.alex.myapplication;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.SimpleAdapter;

public class AlertsFragment extends Fragment {

    public AlertsFragment() {}

    private RecyclerView recyclerView;
    private RecyclerView.Adapter mAdapter;

    private RecyclerView.LayoutManager mLayoutManager;
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_alerts, container, false);

        recyclerView = (RecyclerView)rootView.findViewById(R.id.alertsRecyclerView);
        mAdapter = new CardItemAdapter(new String[] { "", "", "", "" }, getActivity());
        mLayoutManager = new LinearLayoutManager(getActivity());
        recyclerView.setLayoutManager(mLayoutManager);


        recyclerView.setAdapter(mAdapter);

        return rootView;
    }




}
