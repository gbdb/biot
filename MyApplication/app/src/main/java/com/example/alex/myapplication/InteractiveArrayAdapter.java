package com.example.alex.myapplication;

import java.util.HashMap;
import java.util.List;

import android.app.Activity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.CompoundButton;
import android.widget.Switch;
import android.widget.TextView;

public class InteractiveArrayAdapter extends ArrayAdapter<Pump> {


    private List<Pump> list;

    private Activity context;

    public InteractiveArrayAdapter(Activity context, List<Pump> list) {
        super(context, R.layout.pompe_item, list);
        this.context = context;
        this.list = list;
    }

    static class ViewHolder {
        protected TextView text;
        protected Switch checkbox;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        View view = null;
        if (convertView == null) {
            LayoutInflater inflator = context.getLayoutInflater();
            view = inflator.inflate(R.layout.pompe_item, null);
            final ViewHolder viewHolder = new ViewHolder();
            viewHolder.text = (TextView) view.findViewById(R.id.pump_name);
            viewHolder.checkbox = (Switch) view.findViewById(R.id.pump_switch);
            viewHolder.checkbox
                    .setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {

                        @Override
                        public void onCheckedChanged(CompoundButton buttonView,
                                                     boolean isChecked) {
                            Pump element = (Pump) viewHolder.checkbox
                                    .getTag();

                            element.setStatus(buttonView.isChecked());

                            HashMap<String,Object> args = new HashMap<>();
                            args.put("id", element.getId());
                            args.put("name", element.getName());
                            args.put("status", element.isStatus());

                            ServerCommunication.getInstance().sendEvent("TOGGLE_PUMP", args);


                        }
                    });
            view.setTag(viewHolder);
            viewHolder.checkbox.setTag(list.get(position));
        } else {
            view = convertView;
            ((ViewHolder) view.getTag()).checkbox.setTag(list.get(position));
        }
        ViewHolder holder = (ViewHolder) view.getTag();
        holder.text.setText(list.get(position).getName());
        holder.checkbox.setChecked(list.get(position).isStatus());
        return view;
    }

}