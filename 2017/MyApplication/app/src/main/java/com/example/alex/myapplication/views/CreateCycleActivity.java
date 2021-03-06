package com.example.alex.myapplication.views;

import android.app.FragmentManager;
import android.os.Bundle;
import android.support.design.widget.Snackbar;
import android.support.v7.app.AppCompatActivity;
import android.view.Menu;
import android.view.MenuItem;
import com.example.alex.myapplication.views.fragments.CreateCycleFragment;
import com.example.alex.myapplication.R;

public class CreateCycleActivity extends AppCompatActivity {


    private CreateCycleFragment createCycleFragment;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_create_cycle);

        createCycleFragment = new CreateCycleFragment();

        FragmentManager fragmentManager = getFragmentManager();
        fragmentManager.beginTransaction()
                .replace(R.id.main_content, createCycleFragment)
                .commit();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_create_cycle, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.confirmCycleCreation) {
            createCycleFragment.sendCycle();
            Snackbar.make(findViewById(R.id.main_content), "Cycle envoyé", Snackbar.LENGTH_LONG).show();
            //finish();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
}