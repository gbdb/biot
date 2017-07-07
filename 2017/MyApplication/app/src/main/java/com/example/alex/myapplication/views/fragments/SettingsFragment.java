package com.example.alex.myapplication.views.fragments;

import android.os.Bundle;
import android.preference.PreferenceFragment;

import com.example.alex.myapplication.R;

public class SettingsFragment extends PreferenceFragment {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        addPreferencesFromResource(R.xml.preferences);
    }
}