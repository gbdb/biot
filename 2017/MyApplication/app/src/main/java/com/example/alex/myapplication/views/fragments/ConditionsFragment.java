package com.example.alex.myapplication.views.fragments;

import android.os.Bundle;
import android.support.annotation.Nullable;
import android.support.v4.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.communication.ServerCommunication;
import com.example.alex.myapplication.util.DataCallBack;

public class ConditionsFragment extends Fragment implements DataCallBack {

    public ConditionsFragment() {
    }

    private TextView temp1;
    private TextView temp2;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_conditions, container, false);

        temp1 = (TextView)rootView.findViewById(R.id.label_temp_out);
        temp2 = (TextView)rootView.findViewById(R.id.label_temp_water);
        return rootView;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ServerCommunication.getInstance(getActivity()).subscribeToNewTemperature(getActivity(), this);
    }

    @Override
    public void onSuccess(Object result) {
        String[] temps = (String[])result.toString().split(",");

        temp1.setText(temps[0] += "°");
        temp2.setText(temps[1] += "°");
    }

    @Override
    public void onFailure() {

    }
}
