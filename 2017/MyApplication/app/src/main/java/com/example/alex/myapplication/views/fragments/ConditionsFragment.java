package com.example.alex.myapplication.views.fragments;

import android.graphics.Color;
import android.graphics.PorterDuff;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.widget.SwipeRefreshLayout;
import android.view.LayoutInflater;
import android.view.View;

import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.communication.BiotDataCallback;
import com.example.alex.myapplication.communication.SocketIOLiveDataProvider;


public class ConditionsFragment extends Fragment{

    public ConditionsFragment() {}

    private TextView temp1;
    private TextView temp2;

    private ProgressBar progressBar;

    private SwipeRefreshLayout swipeRefreshLayout;

    private SocketIOLiveDataProvider dataProviderAdapter;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_conditions, container, false);

        temp1 = (TextView)rootView.findViewById(R.id.label_temp_out);
        temp2 = (TextView)rootView.findViewById(R.id.label_temp_water);
        progressBar = (ProgressBar)rootView.findViewById(R.id.progressBar);

        progressBar.getIndeterminateDrawable().setColorFilter(Color.RED, PorterDuff.Mode.MULTIPLY);

        swipeRefreshLayout = (SwipeRefreshLayout)rootView.findViewById(R.id.swipeRefresh);

        swipeRefreshLayout.setOnRefreshListener(new SwipeRefreshLayout.OnRefreshListener() {
            @Override
            public void onRefresh() {
                //pour linstant
                swipeRefreshLayout.setRefreshing(false);
            }
        });

        progressBar.setProgress(70);
        return rootView;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        dataProviderAdapter = new SocketIOLiveDataProvider(getActivity());
        dataProviderAdapter.subscribe("newTemp", new BiotDataCallback() {
            @Override
            public void onDataReceived(Object result) {
                String[] temps = result.toString().split(",");
                temp1.setText(temps[1] += "°");
                temp2.setText(temps[0] += "°");
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
    }
}