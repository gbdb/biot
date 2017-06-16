package com.example.alex.myapplication;

import android.content.Intent;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentPagerAdapter;
import android.support.v4.view.ViewPager;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private SectionsPagerAdapter mSectionsPagerAdapter;
    private ViewPager mViewPager;

    private ConditionsFragment conditionsFragment;
    private ControlFragment controlFragment;
    private AlertsFragment alertsFragment;

    private List<String> sectionNames;
    private List<Fragment> _fragments;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        conditionsFragment = new ConditionsFragment();
        controlFragment = new ControlFragment();
        alertsFragment = new AlertsFragment();

        _fragments = new ArrayList<>();
        _fragments.add(conditionsFragment);
        _fragments.add(controlFragment);
        _fragments.add(alertsFragment);

        sectionNames = new ArrayList<>();
        sectionNames.add(getString(R.string.section_conditions));
        sectionNames.add(getString(R.string.section_control));
        sectionNames.add(getString(R.string.section_alerts));

        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        mSectionsPagerAdapter = new SectionsPagerAdapter(getSupportFragmentManager());
        mViewPager = (ViewPager) findViewById(R.id.container);
        mViewPager.setAdapter(mSectionsPagerAdapter);
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_main, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.action_settings) {
            //start settings activity
            Intent intent = new Intent(this, SettingsActivity.class);
            startActivity(intent);
            return true;
        }

        return super.onOptionsItemSelected(item);
    }

    public class SectionsPagerAdapter extends FragmentPagerAdapter {

        public SectionsPagerAdapter(FragmentManager fm) {
            super(fm);
        }

        @Override
        public Fragment getItem(int position) {
            return _fragments.get(position);
        }

        @Override
        public CharSequence getPageTitle(int position) {
            return sectionNames.get(position).toUpperCase();
        }

        @Override
        public int getCount() {
            return sectionNames.size();
        }

        @Override
        public int getItemPosition(Object object) {
            return POSITION_NONE;
        }
    }
}