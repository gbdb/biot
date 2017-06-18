package com.example.alex.myapplication.views.fragments;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import android.widget.Spinner;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.adapters.InteractiveArrayAdapter;
import com.example.alex.myapplication.models.Pump;

import java.util.ArrayList;


public class ControlFragment extends Fragment {

    public ControlFragment() {}

    private ListView listView;
    private InteractiveArrayAdapter myAdapter;

    private ArrayList<Pump> pumps;
    private ArrayAdapter cyclesAdapter;

    private Spinner cyclesSpinner;
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_control, container, false);

        cyclesSpinner = (Spinner)rootView.findViewById(R.id.spinner);

        ArrayList<String> cycles = new ArrayList<>();
        cycles.add("Regular 12/12");
        cyclesAdapter = new ArrayAdapter(getActivity(), R.layout.support_simple_spinner_dropdown_item, cycles);
        cyclesSpinner.setAdapter(cyclesAdapter);

        pumps = new ArrayList<>();
        pumps.add(new Pump("Pompe principale de marde",  "Relay-7"));
        pumps.add(new Pump("Ma criss de pompe", "420"));
        pumps.add(new Pump("Ma tabarnak de pompe", "3"));
        pumps.add(new Pump("Mon osti de ciboire de pompe", "4"));
        myAdapter = new InteractiveArrayAdapter(getActivity(), pumps);
        listView = (ListView)rootView.findViewById(R.id.pump_listView);
        listView.setAdapter(myAdapter);
        return rootView;
    }
}
