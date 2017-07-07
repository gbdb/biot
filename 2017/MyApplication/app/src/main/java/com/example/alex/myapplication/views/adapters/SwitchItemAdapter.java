package com.example.alex.myapplication.views.adapters;

import android.app.Activity;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.CompoundButton;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.ToggleButton;

import com.android.volley.Request;
import com.example.alex.myapplication.R;
import com.example.alex.myapplication.communication.Action;
import com.example.alex.myapplication.communication.ApiRoutes;
import com.example.alex.myapplication.communication.BiotDataCallback;
import com.example.alex.myapplication.communication.daos.BaseBiotDAO;
import com.example.alex.myapplication.dispatchers.RequestDispatcher;
import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.models.Cycle;
import com.example.alex.myapplication.models.Relay;
import com.example.alex.myapplication.parsers.RelayParser;
import java.util.List;

public class SwitchItemAdapter extends ArrayAdapter<Biot> {

    private List<Biot> dataSet;
    private Activity context;
    private RequestDispatcher requestDispatcher;

    public SwitchItemAdapter(Activity context, List<Biot> list) {
        super(context, R.layout.pompe_item, list);
        this.context = context;
        this.dataSet = list;
        requestDispatcher = RequestDispatcher.getInstance();
    }

    static class ViewHolder {
        protected TextView text;
        protected Switch aSwitch;
        protected TextView cycleName;
        protected TextView timeOn;
        protected TextView timeOff;
    }

    @Override
    public View getView(int position, final View convertView, ViewGroup parent) {
        View view = null;
        if (convertView == null) {
            LayoutInflater inflator = context.getLayoutInflater();
            view = inflator.inflate(R.layout.pompe_item_v2, null);
            final ViewHolder viewHolder = new ViewHolder();
            viewHolder.text = (TextView) view.findViewById(R.id.pump_name);
            viewHolder.cycleName = (TextView)view.findViewById(R.id.cycleName);
            viewHolder.timeOn = (TextView)view.findViewById(R.id.timeOn);
            viewHolder.timeOff = (TextView)view.findViewById(R.id.timeOff);
            viewHolder.aSwitch = (Switch) view.findViewById(R.id.pump_switch);

            viewHolder.aSwitch.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Relay element = (Relay) viewHolder.aSwitch
                            .getTag();
                    element.setStatus(viewHolder.aSwitch.isChecked());

                    onToggle(element);
                }
            });


            /*
            viewHolder.aSwitch.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {

                @Override
                public void onCheckedChanged(final CompoundButton buttonView,
                                             boolean isChecked) {


                    Relay element = (Relay) viewHolder.aSwitch
                            .getTag();
                    element.setStatus(buttonView.isChecked());

                    onToggle(element);
                }
            });*/

            view.setTag(viewHolder);
            viewHolder.aSwitch.setTag(dataSet.get(position));

        } else {
            view = convertView;
            ((ViewHolder) view.getTag()).aSwitch.setTag(dataSet.get(position));
        }
        ViewHolder holder = (ViewHolder) view.getTag();
        Relay relay = (Relay)dataSet.get(position);
        Cycle cycle = relay.getCycle();
        holder.text.setText(relay.getName());
        holder.cycleName.setText(cycle.getName());
        holder.timeOff.setText(String.valueOf(cycle.getTempsOff()));
        holder.timeOn.setText(String.valueOf(cycle.getTempsOn()));
        holder.aSwitch.setChecked(relay.isStatus());
        return view;
    }

    private void onToggle(Relay relay) {
        Log.i("SwitchItemAdapter", relay.toString());
        new BaseBiotDAO(new Action(ApiRoutes.TOGGLE_PUMP, Request.Method.POST), getContext()).update(relay, new RelayParser(),
            new BiotDataCallback() {
                @Override
                public void onDataReceived(Object object) {

                }
        });
    }
}