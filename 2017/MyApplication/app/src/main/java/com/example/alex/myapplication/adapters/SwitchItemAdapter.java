package com.example.alex.myapplication.adapters;

import android.app.Activity;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.CompoundButton;
import android.widget.Switch;
import android.widget.TextView;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.communication.ServerCommunication;
import com.example.alex.myapplication.models.Relay;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SwitchItemAdapter extends ArrayAdapter<Relay> {

    private List<Relay> dataSet;
    private Activity context;

    public SwitchItemAdapter(Activity context, List<Relay> list) {
        super(context, R.layout.pompe_item, list);
        this.context = context;
        this.dataSet = list;
    }

    static class ViewHolder {
        protected TextView text;
        protected Switch aSwitch;
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
            viewHolder.aSwitch = (Switch) view.findViewById(R.id.pump_switch);

            listner = new CompoundButton.OnCheckedChangeListener() {

                @Override
                public void onCheckedChanged(CompoundButton buttonView,
                                             boolean isChecked) {
                    Relay element = (Relay) viewHolder.aSwitch
                            .getTag();
                    element.setStatus(buttonView.isChecked());

                    Map<String,Object> args = new HashMap<>();
                    args.put("id", element.getId());
                    args.put("name", element.getName());
                    args.put("status", element.isStatus());
                    Log.i("SwitchAdapter", ServerCommunication.getInstance().getSocket().toString());
                    ServerCommunication.getInstance().sendEvent("TOGGLE_PUMP", args);
                    Log.i("SwitchItemAdapter", "Heyy im here babe");
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
        holder.text.setText(dataSet.get(position).getName());
        holder.aSwitch.setOnCheckedChangeListener(null);
        holder.aSwitch.setChecked(dataSet.get(position).isStatus());
        holder.aSwitch.setOnCheckedChangeListener(listner);
        return view;
    }
}