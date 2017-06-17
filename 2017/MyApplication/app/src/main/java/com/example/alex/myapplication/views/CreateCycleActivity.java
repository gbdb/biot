package com.example.alex.myapplication.views;


import android.app.FragmentManager;
import android.os.Bundle;
import android.app.Fragment;
import android.support.v7.app.AppCompatActivity;

import com.example.alex.myapplication.views.fragments.CreateCycleFragment;
import com.example.alex.myapplication.R;

public class CreateCycleActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        Fragment fragment = new CreateCycleFragment();

        FragmentManager fragmentManager = getFragmentManager();
        fragmentManager.beginTransaction()
                .replace(R.id.main_content, fragment)
                .commit();
    }
}