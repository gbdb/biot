package com.example.alex.myapplication.views;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.preference.PreferenceManager;
import android.support.design.widget.TabLayout;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentPagerAdapter;
import android.support.v4.view.ViewPager;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

import com.example.alex.myapplication.communication.ServerCommunication;
import com.example.alex.myapplication.util.DataCallBack;
import com.example.alex.myapplication.views.fragments.AlertsFragment;
import com.example.alex.myapplication.views.fragments.ConditionsFragment;
import com.example.alex.myapplication.views.fragments.ControlFragment;
import com.example.alex.myapplication.R;
import com.getbase.floatingactionbutton.FloatingActionButton;
import com.getbase.floatingactionbutton.FloatingActionsMenu;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends AppCompatActivity implements DataCallBack {

    private SectionsPagerAdapter mSectionsPagerAdapter;
    private ViewPager mViewPager;

    private List<String> sectionNames;
    private List<Fragment> _fragments;

    private FloatingActionButton fb;
    private FloatingActionsMenu menu;
    private TabLayout tabLayout;

    private final int[] tabIcons = {
        R.drawable.ic_assignment_black_24dp,
        R.drawable.ic_tune_black_24dp,
        R.drawable.ic_notifications_black_24dp
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        SharedPreferences sharedPref = PreferenceManager.getDefaultSharedPreferences(this);
        String ip = sharedPref.getString("ip_pref", getString(R.string.default_ip));
        ip = "http://" + ip;
        ServerCommunication.URI = ip;

        final int tabIconColor = ContextCompat.getColor(this, R.color.colorPrimary);

        tabLayout = (TabLayout)findViewById(R.id.tabLayout);

        _fragments = new ArrayList<>();
        _fragments.add(new ConditionsFragment());
        _fragments.add(new ControlFragment());
        _fragments.add(new AlertsFragment());

        menu = (FloatingActionsMenu)findViewById(R.id.multiple_actions);
        fb = (FloatingActionButton)findViewById(R.id.fab_action_cycle);
        fb.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(MainActivity.this, CreateCycleActivity.class);
                menu.collapseImmediately();
                startActivity(intent);
            }
        });

        fb.setIcon(R.drawable.ic_timer_black_24dp);
        sectionNames = new ArrayList<>();
        sectionNames.add(getString(R.string.section_conditions));
        sectionNames.add(getString(R.string.section_control));
        sectionNames.add(getString(R.string.section_alerts));

        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        mSectionsPagerAdapter = new SectionsPagerAdapter(getSupportFragmentManager());
        mViewPager = (ViewPager) findViewById(R.id.container);
        mViewPager.setAdapter(mSectionsPagerAdapter);
        mViewPager.setOffscreenPageLimit(3);
        Log.i("MainActivity", ServerCommunication.getInstance().getSocket().toString());
        //ServerCommunication.getInstance().registerToToastAlerts(this, this);
        FirebaseMessaging.getInstance().subscribeToTopic("events");


        tabLayout.setupWithViewPager(mViewPager);
        /*
        tabLayout.getTabAt(0).setIcon(tabIcons[0]);
        tabLayout.getTabAt(1).setIcon(tabIcons[1]);
        tabLayout.getTabAt(2).setIcon(tabIcons[2]);
        tabLayout.getTabAt(0).getIcon().setColorFilter(tabIconColor,PorterDuff.Mode.SRC_IN);

        tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                tab.getIcon().setColorFilter(tabIconColor, PorterDuff.Mode.SRC_IN);
            }

            @Override
            public void onTabUnselected(TabLayout.Tab tab) {
                int tabIconColor = ContextCompat.getColor(MainActivity.this, R.color.black);
                tab.getIcon().setColorFilter(tabIconColor, PorterDuff.Mode.SRC_IN);
            }

            @Override
            public void onTabReselected(TabLayout.Tab tab) {

            }
        });
        */
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
            Intent intent = new Intent(this, SettingsActivity.class);
            startActivity(intent);
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    public void onSuccess(Object result, String context) {
        Toast.makeText(MainActivity.this, (String)result, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onFailure() {
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