package com.example.alex.myapplication;

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
import android.widget.ArrayAdapter;
import android.widget.ListView;
import android.widget.SimpleAdapter;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private SectionsPagerAdapter mSectionsPagerAdapter;
    private ViewPager mViewPager;

    private ConditionsFragment conditionsFragment;
    private ControlFragment controlFragment;
    private AlertsFragment alertsFragment;

    private List<String> fragments;
    private List<String> sectionNames;

    private List<Fragment> _fragments;

    private SimpleAdapter simpleAdapter;

    private ListView pump_list;



    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        conditionsFragment = new ConditionsFragment();
        controlFragment = new ControlFragment();
        alertsFragment = new AlertsFragment();
        fragments = new ArrayList<>();
        Log.i("------------->ACTVITY1", String.valueOf((ListView) findViewById(R.id.pump_listView)));

        _fragments = new ArrayList<>();

        _fragments.add(conditionsFragment);
        _fragments.add(controlFragment);
        _fragments.add(alertsFragment);

        sectionNames = new ArrayList<>();

        fragments.add(ConditionsFragment.class.getName());
        fragments.add(ControlFragment.class.getName());
        fragments.add(AlertsFragment.class.getName());

        sectionNames.add(getString(R.string.section_conditions));
        sectionNames.add(getString(R.string.section_control));
        sectionNames.add(getString(R.string.section_alerts));

        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        toolbar.setTitle("Mon Jardin - Maison");

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
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();

        //noinspection SimplifiableIfStatement
        if (id == R.id.action_settings) {
            return true;
        }

        Toast.makeText(MainActivity.this, "Tabarnak", Toast.LENGTH_SHORT).show();

        return super.onOptionsItemSelected(item);
    }


    public class SectionsPagerAdapter extends FragmentPagerAdapter {

        public List<String> fragmentsA;

        public SectionsPagerAdapter(FragmentManager fm) {
            super(fm);
            fragmentsA = fragments;
        }

        @Override
        public Fragment getItem(int position) {
            //return MyFragment.newInstance();

            return _fragments.get(position);

        }

        @Override
        public CharSequence getPageTitle(int position) {
            //return CONTENT[position % CONTENT.length].toUpperCase();
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