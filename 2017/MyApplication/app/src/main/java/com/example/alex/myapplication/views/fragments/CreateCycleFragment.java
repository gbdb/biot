package com.example.alex.myapplication.views.fragments;

import android.os.Bundle;
import android.app.Fragment;
import android.transition.TransitionManager;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;

import com.android.volley.Request;
import com.example.alex.myapplication.R;
import com.example.alex.myapplication.communication.ApiRoutes;
import com.example.alex.myapplication.communication.daos.BaseBiotDAO;
import com.example.alex.myapplication.communication.BiotDataCallback;
import com.example.alex.myapplication.communication.Action;
import com.example.alex.myapplication.models.Cycle;
import com.example.alex.myapplication.models.Relay;
import com.example.alex.myapplication.parsers.CycleParser;
import com.example.alex.myapplication.parsers.RelayParser;

import java.util.ArrayList;
import java.util.Collection;


public class CreateCycleFragment extends Fragment {

    private TextView temps_off;
    private TextView temps_on;
    private CheckBox checkBox;
    private EditText editText;
    private SeekBar seekBarOff;
    private SeekBar seekBarOn;

    private Spinner relaysSpinner;

    private ArrayAdapter<String> adapter;
    private ArrayList<String> relaysNames;
    private ArrayList<Relay> relays;

    private String selectedRelayId;
    private int selectRelayIndex;

    @Override
    public View onCreateView(LayoutInflater inflater,ViewGroup container,Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_create_cycle, container, false);

        relaysSpinner = (Spinner)rootView.findViewById(R.id.relayToCycleSpinner);
        editText = (EditText)rootView.findViewById(R.id.cycleName);

        relays = new ArrayList<>();

        checkBox = (CheckBox) rootView.findViewById(R.id.checkboxApplyCycleOnCreation);
        relaysNames = new ArrayList<>();


        adapter = new ArrayAdapter(getActivity(), android.R.layout.simple_spinner_dropdown_item,
                relaysNames);

        relaysSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                selectedRelayId = relays.get(position).getId();
                selectRelayIndex = position;
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {

            }
        });

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

        initSeekBar();




        new BaseBiotDAO("relays",new RelayParser(), getActivity()).fetchAll(new BiotDataCallback() {
            @Override
            public void onDataReceived(Object object) {
                relays.clear();
                relays.addAll((Collection<? extends Relay>) object);
                for(Relay relay:relays)
                    relaysNames.add(relay.getName());
                adapter.notifyDataSetChanged();
            }
        });

        return rootView;
    }

    private void initSeekBar() {
        seekBarOff.setMax(60);
        seekBarOn.setMax(60);

        seekBarOff.setProgress(10);
        temps_off.setText(String.valueOf(10));
        seekBarOn.setProgress(15);
        temps_on.setText(String.valueOf(15));

        SeekBarListener listener = new SeekBarListener();

        seekBarOff.setOnSeekBarChangeListener(listener);
        seekBarOn.setOnSeekBarChangeListener(listener);
    }

    private Cycle createCycle() {
        if(checkBox.isChecked())
            return new Cycle(editText.getText().toString(),seekBarOff.getProgress(),
                seekBarOn.getProgress(),selectedRelayId);
        else return new Cycle(editText.getText().toString(),seekBarOff.getProgress(),
                seekBarOn.getProgress());
    }

    public void sendCycle() {
        new BaseBiotDAO(ApiRoutes.CYCLES, new CycleParser(), getActivity()).update(createCycle(), new BiotDataCallback() {
                @Override
                public void onDataReceived(Object object) {
                    if(checkBox.isChecked()){

                        Relay relayToApplyCycleOn = relays.get(selectRelayIndex);
                        relayToApplyCycleOn.setCycle(createCycle());

                        new BaseBiotDAO(new Action(ApiRoutes.RESET_PUMP, Request.Method.PUT), new RelayParser(), getActivity()).update(relayToApplyCycleOn, new BiotDataCallback() {
                            @Override
                            public void onDataReceived(Object object) {
                                getActivity().finish();
                            }
                        });
                    }
                }
        });
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
}