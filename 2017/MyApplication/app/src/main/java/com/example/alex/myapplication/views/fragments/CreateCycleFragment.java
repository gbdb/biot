package com.example.alex.myapplication.views.fragments;

import android.os.Bundle;
import android.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.communication.ServerCommunication;
import com.example.alex.myapplication.views.CreateCycleActivity;

import java.util.HashMap;

public class CreateCycleFragment extends Fragment {

    private EditText temps_off;
    private EditText temps_on;
    private Button button;

    @Override
    public View onCreateView(LayoutInflater inflater,ViewGroup container,Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_create_cycle, container, false);

        temps_off = (EditText)rootView.findViewById(R.id.tempsOff);
        temps_on = (EditText)rootView.findViewById(R.id.tempsOn);


        button = (Button)rootView.findViewById(R.id.button);
        button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                ServerCommunication comm = ServerCommunication.getInstance(getActivity());
                HashMap<String,Object> args = new HashMap();
                args.put("tempsOff", temps_off.getText().toString());
                args.put("tempsOn", temps_on.getText().toString());
                comm.sendEvent("NEW_INTERVAL", args);
            }
        });
        return rootView;
    }
}
