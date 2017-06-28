package com.example.alex.myapplication.communication;


import android.content.Context;
import android.widget.Toast;

import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonArrayRequest;
import com.example.alex.myapplication.models.Alert;
import com.example.alex.myapplication.models.IOEnty;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;

public class AlertDAO extends DAO  {

    private AlertListener alertListener;

    public AlertDAO(String url, Context context) {
        super(url, context);
        //maybe have a fix endpoint to feed a list of all avaialable routes
        endPoint += "/API/alerts";
    }

    @Override
    public void fetchAll() {
        JsonArrayRequest request = new JsonArrayRequest(endPoint, new Response.Listener<JSONArray>() {
            @Override
            public void onResponse(JSONArray response) {
                try {
                    for(int i = 0; i< response.length(); i++) {
                        JSONObject object = (JSONObject)response.get(i);
                        String message = (String)object.get("message");
                        Alert alert = new Alert(message);
                        alertListener.onNewAlert(alert);
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

    @Override
    public boolean add(IOEnty ioEnty) {
        return false;
    }

    public void setAlertListener(AlertListener alertListener) {
        this.alertListener = alertListener;
    }
}
