package com.example.alex.myapplication.communication;

import android.content.Context;
import android.widget.Toast;

import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonArrayRequest;
import com.example.alex.myapplication.models.Alert;
import com.example.alex.myapplication.models.IOEnty;
import com.example.alex.myapplication.models.Relay;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;


public class RelayDAO extends DAO implements Operation {

    private RelayListener relayListener;

    public RelayDAO(String url, Context context) {
        super(url, context);
        endPoint += "/API/relays";
        Toast.makeText(context, endPoint, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void fetchAll() {
        JsonArrayRequest request = new JsonArrayRequest(endPoint, new Response.Listener<JSONArray>() {
            @Override
            public void onResponse(JSONArray response) {
                try {
                    for(int i = 0; i< response.length(); i++) {
                        JSONObject object = (JSONObject)response.get(i);
                        String name = (String)object.get("name");
                        String _id = (String)object.get("_id");
                        boolean status = (boolean)object.get("status");
                        Relay relay = new Relay(name,_id,status);
                        relayListener.onNewRelay(relay);
                    }
                }
                catch(JSONException e) {}
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {}
        });
        queue.add(request);
    }

    public void setRelayListener(RelayListener relayListener) {this.relayListener = relayListener;}

    @Override
    public boolean add(IOEnty ioEnty) {
        return false;
    }
}
