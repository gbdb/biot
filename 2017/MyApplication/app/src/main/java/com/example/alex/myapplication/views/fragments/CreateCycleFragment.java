package com.example.alex.myapplication.views.fragments;

import android.os.Bundle;
import android.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.SeekBar;
import android.widget.TextView;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.communication.ServerCommunication;

import java.util.HashMap;

public class CreateCycleFragment extends Fragment {

    private TextView temps_off;
    private TextView temps_on;
    private Button button;

    private SeekBar seekBarOff;
    private SeekBar seekBarOn;

    @Override
    public View onCreateView(LayoutInflater inflater,ViewGroup container,Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_create_cycle, container, false);

        temps_off = (TextView) rootView.findViewById(R.id.tempsOff);
        temps_on = (TextView) rootView.findViewById(R.id.tempsOn);

        seekBarOff = (SeekBar) rootView.findViewById(R.id.seekBarOff);
        seekBarOn = (SeekBar) rootView.findViewById(R.id.seekBarOn);

        SeekBarListener listener = new SeekBarListener();

        seekBarOff.setOnSeekBarChangeListener(listener);

        seekBarOn.setOnSeekBarChangeListener(listener);

        /*button = (Button)rootView.findViewById(R.id.button);
        button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                /*
                ServerCommunication comm = ServerCommunication.getInstance(getActivity());
                HashMap<String,Object> args = new HashMap();
                args.put("tempsOff", temps_off.getText().toString());
                args.put("tempsOn", temps_on.getText().toString());
                comm.sendEvent("NEW_INTERVAL", args);

            }
        });*/
        return rootView;
    }

    private class SeekBarListener implements SeekBar.OnSeekBarChangeListener {

        @Override
        public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
            if(seekBar.equals(seekBarOff))
                temps_off.setText(String.valueOf(progress));
            else
                temps_on.setText(String.valueOf(progress));
        }

        @Override
        public void onStartTrackingTouch(SeekBar seekBar) {

        }

        @Override
        public void onStopTrackingTouch(SeekBar seekBar) {

        }
    }
}

