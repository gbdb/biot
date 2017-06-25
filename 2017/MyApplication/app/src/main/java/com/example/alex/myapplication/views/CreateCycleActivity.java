package com.example.alex.myapplication.views;


import android.app.FragmentManager;
import android.os.Bundle;
import android.app.Fragment;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;

import com.example.alex.myapplication.communication.ServerCommunication;
import com.example.alex.myapplication.views.fragments.CreateCycleFragment;
import com.example.alex.myapplication.R;

import java.util.HashMap;

public class CreateCycleActivity extends AppCompatActivity {


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_create_cycle);

        Fragment fragment = new CreateCycleFragment();

        FragmentManager fragmentManager = getFragmentManager();
        fragmentManager.beginTransaction()
                .replace(R.id.main_content, fragment)
                .commit();


    }
}