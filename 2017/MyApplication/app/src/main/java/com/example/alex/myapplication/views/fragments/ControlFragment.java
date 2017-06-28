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
import android.widget.ProgressBar;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.adapters.SwitchItemAdapter;
import com.example.alex.myapplication.communication.RelayDAO;
import com.example.alex.myapplication.communication.RelayListener;
import com.example.alex.myapplication.models.Relay;


import java.util.ArrayList;


public class ControlFragment extends Fragment implements RelayListener {

    public ControlFragment() {}

    private ListView listView;
    private SwitchItemAdapter myAdapter;

    private ArrayList<Relay> relays;

    private ProgressBar progressBar;

    private SwipeRefreshLayout swipeRefreshLayout;
    private RelayDAO relayDAO;

    @Override
    public void onCreate(Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);
        SharedPreferences sharedPref = PreferenceManager.getDefaultSharedPreferences(getActivity());
        String ip = sharedPref.getString("ip_pref", getActivity().getString(R.string.default_ip));

        relayDAO = new RelayDAO(ip, getContext());

        relayDAO.setRelayListener(this);
        relayDAO.fetchAll();
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_control, container, false);

        progressBar = (ProgressBar)rootView.findViewById(R.id.progressBar);
        swipeRefreshLayout = (SwipeRefreshLayout)rootView.findViewById(R.id.swipeRefresh);

        swipeRefreshLayout.setOnRefreshListener(new SwipeRefreshLayout.OnRefreshListener() {
            @Override
            public void onRefresh() {
                relays.clear();
                relayDAO.fetchAll();
                swipeRefreshLayout.setRefreshing(false);
            }
        });

        relays = new ArrayList<>();
        myAdapter = new SwitchItemAdapter(getActivity(), relays);
        listView = (ListView)rootView.findViewById(R.id.pump_listView);
        listView.setAdapter(myAdapter);
        return rootView;
    }

    @Override
    public void onResume() {
        super.onResume();
    }

    @Override
    public void onNewRelay(Relay relay) {
        relays.add(relay);
        myAdapter.notifyDataSetChanged();
        progressBar.setVisibility(View.INVISIBLE);
    }
}
