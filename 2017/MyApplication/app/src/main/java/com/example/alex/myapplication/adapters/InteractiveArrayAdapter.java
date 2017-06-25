package com.example.alex.myapplication.adapters;

import android.app.Activity;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.CompoundButton;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import com.example.alex.myapplication.util.DataCallBack;
import com.example.alex.myapplication.R;
import com.example.alex.myapplication.communication.ServerCommunication;
import com.example.alex.myapplication.models.Pump;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class InteractiveArrayAdapter extends ArrayAdapter<Pump> implements DataCallBack {

    private List<Pump> dataSet;
    private Activity context;

    public InteractiveArrayAdapter(Activity context, List<Pump> list) {
        super(context, R.layout.pompe_item, list);
        this.context = context;
        this.dataSet = list;
        String endPoint = "http://";
        SharedPreferences sharedPref = PreferenceManager.getDefaultSharedPreferences(context);
        String ip = sharedPref.getString("ip_pref", context.getString(R.string.default_ip));
        endPoint += ( ip + "/API/relays");
        Map<String,Object> args1 = new HashMap<>();
        args1.put("url", endPoint);
        ServerCommunication.getInstance(context).request(context, args1, this);


        //ServerCommunication.getInstance(context).subscribeToNewTemperature(context,this);
    }

    //// TODO: 6/16/17 code cleanup
    @Override
    public void onSuccess(Object result, String context) {
        JSONArray receivedDataSet = (JSONArray)result;

        try {
            dataSet.clear();
            for(int i = 0; i< receivedDataSet.length(); i++) {
                JSONObject object = (JSONObject)receivedDataSet.get(i);
                String name = (String)object.get("name");
                String id = (String)object.get("_id");
                Pump pump = new Pump(name, id);
                dataSet.add(pump);
            }

        } catch (JSONException e) {
            e.printStackTrace();
        }

        notifyDataSetChanged();
    }

    @Override
    public void onFailure() {
        Toast.makeText(context, "Connexion au serveur impossible", Toast.LENGTH_SHORT).show();
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
            view = inflator.inflate(R.layout.pompe_item_v2, null);
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

                            ServerCommunication.getInstance(context).sendEvent("TOGGLE_PUMP", args);
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