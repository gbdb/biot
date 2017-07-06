package com.example.alex.myapplication.views.adapters;

import android.app.Activity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.CompoundButton;
import android.widget.Switch;
import android.widget.TextView;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.communication.ServerCommunication;
import com.example.alex.myapplication.models.Alert;
import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.models.Cycle;
import com.example.alex.myapplication.models.Relay;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class SwitchItemAdapter extends ArrayAdapter<Biot> {

    private List<Biot> dataSet;
    private Activity context;

    public SwitchItemAdapter(Activity context, List<Biot> list) {
        super(context, R.layout.pompe_item, list);
        this.context = context;
        this.dataSet = list;
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
        CompoundButton.OnCheckedChangeListener listner = null;
        if (convertView == null) {
            LayoutInflater inflator = context.getLayoutInflater();
            view = inflator.inflate(R.layout.pompe_item_v2, null);
            final ViewHolder viewHolder = new ViewHolder();
            viewHolder.text = (TextView) view.findViewById(R.id.pump_name);
            viewHolder.cycleName = (TextView)view.findViewById(R.id.cycleName);
            viewHolder.timeOn = (TextView)view.findViewById(R.id.timeOn);
            viewHolder.timeOff = (TextView)view.findViewById(R.id.timeOff);
            viewHolder.aSwitch = (Switch) view.findViewById(R.id.pump_switch);

            listner = new CompoundButton.OnCheckedChangeListener() {

                @Override
                public void onCheckedChanged(final CompoundButton buttonView,
                                             boolean isChecked) {
                    Relay element = (Relay) viewHolder.aSwitch
                            .getTag();
                    element.setStatus(buttonView.isChecked());
                    Map<String,Object> args = new HashMap<>();
                    args.put("id", element.getId());
                    args.put("name", element.getName());
                    args.put("status", element.isStatus());

                    buttonView.setEnabled(false);

                    final ScheduledExecutorService exec = Executors.newScheduledThreadPool(1);

                    exec.schedule(new Runnable(){
                        @Override
                        public void run(){
                            buttonView.setEnabled(true);
                            buttonView.setButtonDrawable(android.R.drawable.btn_default);
                        }
                    }, 4, TimeUnit.SECONDS);

                    notifyPumpEvent("TOGGLE_PUMP", args);
                }
            };
            viewHolder.aSwitch.setOnCheckedChangeListener(listner);
            view.setTag(viewHolder);
            viewHolder.aSwitch.setTag(dataSet.get(position));
        } else {
            view = convertView;
            ((ViewHolder) view.getTag()).aSwitch.setTag(dataSet.get(position));
        }
        ViewHolder holder = (ViewHolder) view.getTag();
        Relay relay = (Relay)dataSet.get(position);
        Cycle cycle = relay.getCycle();
        holder.text.setText(cycle.getName());
        holder.cycleName.setText(String.valueOf(cycle.getName()));
        holder.timeOff.setText(String.valueOf(cycle.getTempsOff()));
        holder.timeOn.setText(String.valueOf(cycle.getTempsOn()));
        holder.aSwitch.setChecked(relay.isStatus());
        return view;
    }

    private void notifyPumpEvent(String eventType, Map<String,Object> args) {
        ServerCommunication communication = ServerCommunication.getInstance();
        if(!communication.getSocket().connected())
            communication.getSocket().connect();


        communication.sendEvent(eventType, args);
    }
}