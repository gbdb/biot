package com.example.alex.myapplication.communication;

import android.content.Context;

import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonArrayRequest;
import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.parsers.BiotEntityParser;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;


public class BiotDAO extends DAO {

    public BiotDAO(String entityName, String url, Context context) {
        super(entityName, url, context);
    }

    @Override
    public void fetchAll(final BiotDataCallback biotDataCallback, final BiotEntityParser parser) {
        JsonArrayRequest request = new JsonArrayRequest(apiEndPoint, new Response.Listener<JSONArray>() {
            @Override
            public void onResponse(JSONArray response) {
                try {
                    List<Biot> biots = new ArrayList<>();
                    for(int i = 0; i < response.length(); i++) {
                        JSONObject object = (JSONObject)response.get(i);
                        Biot biot = parser.parse(object);
                        biots.add(biot);
                    }
                    biotDataCallback.onDataReceived(biots);
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
    public boolean insert(Biot biot) {
        return false;
    }
}