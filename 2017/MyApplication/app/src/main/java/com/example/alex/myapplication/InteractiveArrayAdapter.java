package com.example.alex.myapplication;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import android.app.Activity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.CompoundButton;
import android.widget.Switch;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class InteractiveArrayAdapter extends ArrayAdapter<Pump> implements DataCallBack {

    private List<Pump> dataSet;
    private Activity context;

    public InteractiveArrayAdapter(Activity context, List<Pump> list) {
        super(context, R.layout.pompe_item, list);
        this.context = context;
        this.dataSet = list;

        Map<String,Object> args1 = new HashMap<>();
        args1.put("url", "http://192.168.0.113:3000/API/relays");
        ServerCommunication.getInstance().request(context, args1, this);
    }

    @Override
    public void onSuccess(Object result) {
        JSONArray receivedDataSet = (JSONArray)result;

        try {
            for(int i = 0; i< receivedDataSet.length(); i++) {
                Pump pump = dataSet.get(i);
                JSONObject object = (JSONObject)receivedDataSet.get(i);
                pump.setName((String)object.get("name"));
            }

        } catch (JSONException e) {
            e.printStackTrace();
        }

        notifyDataSetChanged();
    }

    @Override
    public void onFailure() {

    }

    static class ViewHolder {
        protected TextView text;
        protected Switch checkbox;
    }

    @Override
    public View getView(int position, final View convertView, ViewGroup parent) {
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

                            Map<String,Object> args = new HashMap<>();
                            args.put("id", element.getId());
                            args.put("name", element.getName());
                            args.put("status", element.isStatus());

                            ServerCommunication.getInstance().sendEvent("TOGGLE_PUMP", args);
                        }
                    });
            view.setTag(viewHolder);
            viewHolder.checkbox.setTag(dataSet.get(position));
        } else {
            view = convertView;
            ((ViewHolder) view.getTag()).checkbox.setTag(dataSet.get(position));
        }
        ViewHolder holder = (ViewHolder) view.getTag();
        holder.text.setText(dataSet.get(position).getName());
        holder.checkbox.setChecked(dataSet.get(position).isStatus());
        return view;
    }
}