package com.example.alex.myapplication.views.fragments;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.preference.PreferenceManager;
import android.support.v4.app.Fragment;
import android.support.v4.widget.SwipeRefreshLayout;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ListView;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.adapters.SwitchItemAdapter;
import com.example.alex.myapplication.communication.BaseBiotDAO;
import com.example.alex.myapplication.communication.BiotDataCallback;
import com.example.alex.myapplication.models.Cycle;
import com.example.alex.myapplication.models.Relay;
import com.example.alex.myapplication.parsers.RelayParser;


import java.util.ArrayList;
import java.util.Collection;
import java.util.List;


public class ControlFragment extends Fragment{

    public ControlFragment() {}

    private ListView listView;
    private SwipeRefreshLayout swipeRefreshLayout;
    private SwitchItemAdapter myAdapter;

    private List<Relay> relays;
    private List<Cycle> cycles;


    private BaseBiotDAO relayDAO;

    @Override
    public void onCreate(Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);
        SharedPreferences sharedPref = PreferenceManager.getDefaultSharedPreferences(getActivity());
        String ip = sharedPref.getString("ip_pref", getActivity().getString(R.string.default_ip));

        relayDAO = new BaseBiotDAO(ip,"relays", getContext());
        cycles = new ArrayList<>();
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_control, container, false);

        swipeRefreshLayout = (SwipeRefreshLayout)rootView.findViewById(R.id.swipeRefresh);

        swipeRefreshLayout.setOnRefreshListener(new SwipeRefreshLayout.OnRefreshListener() {
            @Override
            public void onRefresh() {
                refreshView();
            }
        });

        relays = new ArrayList<>();
        myAdapter = new SwitchItemAdapter(getActivity(), relays);
        listView = (ListView)rootView.findViewById(R.id.pump_listView);
        listView.setAdapter(myAdapter);
        return rootView;
    }

    private void refreshView() {
        relayDAO.fetchAll(new BiotDataCallback() {
            @Override
            public void onDataReceived(Object object) {
                relays.clear();
                relays.addAll((Collection<? extends Relay>) object);
                myAdapter.notifyDataSetChanged();
                swipeRefreshLayout.setRefreshing(false);
            }
        }, new RelayParser());
    }

    @Override
    public void onResume() {
        super.onResume();
        refreshView();
    }
}