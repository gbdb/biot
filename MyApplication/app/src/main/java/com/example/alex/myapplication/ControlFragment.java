package com.example.alex.myapplication;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ListView;

import java.util.ArrayList;

public class ControlFragment extends Fragment {

    public ControlFragment() {}

    private ListView listView;
    private InteractiveArrayAdapter myAdapter;



    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_control, container, false);
        ArrayList<Pump> pumps = new ArrayList<>();
        pumps.add(new Pump("Pompe principale",  "Relay-7"));
        pumps.add(new Pump("Ma criss de pompe", "420"));
        pumps.add(new Pump("Ma tabarnak de pompe", "3"));
        pumps.add(new Pump("Mon osti de ciboire de pompe", "4"));
        myAdapter = new InteractiveArrayAdapter(getActivity(), pumps);
        listView = (ListView)rootView.findViewById(R.id.pump_listView);
        listView.setAdapter(myAdapter);
        return rootView;
    }
}
