package com.example.alex.myapplication.views.fragments;

import android.os.Bundle;
import android.app.Fragment;
import android.transition.TransitionManager;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.communication.BaseBiotDAO;
import com.example.alex.myapplication.communication.BiotDataCallback;
import com.example.alex.myapplication.models.Cycle;
import com.example.alex.myapplication.models.Relay;
import com.example.alex.myapplication.parsers.RelayParser;

import java.util.ArrayList;
import java.util.Collection;


public class CreateCycleFragment extends Fragment {

    private TextView temps_off;
    private TextView temps_on;
    private CheckBox checkBox;

    private SeekBar seekBarOff;
    private SeekBar seekBarOn;

    private Spinner relaysSpinner;

    private ArrayAdapter<String> adapter;
    private ArrayList<String> relaysNames;
    private ArrayList<Relay> relays;



    @Override
    public View onCreateView(LayoutInflater inflater,ViewGroup container,Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_create_cycle, container, false);

        relaysSpinner = (Spinner)rootView.findViewById(R.id.relayToCycleSpinner);

        relays = new ArrayList<>();

        checkBox = (CheckBox) rootView.findViewById(R.id.checkboxApplyCycleOnCreation);
        relaysNames = new ArrayList<>();


        adapter = new ArrayAdapter(getActivity(), android.R.layout.simple_spinner_dropdown_item,
                relaysNames);

        relaysSpinner.setAdapter(adapter);

        final ViewGroup transitionsContainer = (ViewGroup) rootView.findViewById(R.id.transition_container);

        checkBox.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                TransitionManager.beginDelayedTransition(transitionsContainer);
                relaysSpinner.setVisibility(isChecked ? View.VISIBLE : View.INVISIBLE);
            }
        });

        temps_off = (TextView) rootView.findViewById(R.id.tempsOff);
        temps_on = (TextView) rootView.findViewById(R.id.tempsOn);

        seekBarOff = (SeekBar) rootView.findViewById(R.id.seekBarOff);
        seekBarOn = (SeekBar) rootView.findViewById(R.id.seekBarOn);

        seekBarOff.setMax(60);
        seekBarOn.setMax(60);

        seekBarOff.setProgress(10);
        temps_off.setText(String.valueOf(10));
        seekBarOn.setProgress(15);
        temps_on.setText(String.valueOf(15));

        SeekBarListener listener = new SeekBarListener();

        seekBarOff.setOnSeekBarChangeListener(listener);
        seekBarOn.setOnSeekBarChangeListener(listener);

        new BaseBiotDAO("relays", getActivity()).fetchAll(new BiotDataCallback() {
            @Override
            public void onDataReceived(Object object) {
                relays.clear();
                relays.addAll((Collection<? extends Relay>) object);
                for(Relay relay:relays)
                    relaysNames.add(relay.getName());
                adapter.notifyDataSetChanged();
            }
        }, new RelayParser());
        
        return rootView;
    }

    public Cycle getCycle() {
        return new Cycle(relaysNames.get(0), seekBarOff.getProgress(), seekBarOn.getProgress());
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
        public void onStartTrackingTouch(SeekBar seekBar) {}
        @Override
        public void onStopTrackingTouch(SeekBar seekBar) {}
    }

    public String getBitch(){return "Osti de bitch";}
}