package com.example.alex.myapplication.communication;

import android.content.Context;
import android.util.Log;
import android.widget.Toast;

import com.android.volley.Response;
import com.android.volley.RetryPolicy;
import com.android.volley.TimeoutError;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonArrayRequest;
import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.parsers.BiotEntityParser;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import static java.security.AccessController.getContext;


public class BaseBiotDAO extends DAO {

    public BaseBiotDAO(String entityName, String url, Context context) {
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
            public void onErrorResponse(VolleyError error) {
                Log.i("BaseBiotDAO", "Getting an error");
                Log.i("BaseBiotDAO", "Heres the error " + error.getMessage());
                if (error.networkResponse == null) {
                    if (error.getClass().equals(TimeoutError.class)) {
                        Log.i("BaseBiotDAO", error.getMessage());
                    }
                }
            }
        });
        request.setRetryPolicy(new RetryPolicy() {
            @Override
            public int getCurrentTimeout() {
                return 3*1000;
            }

            @Override
            public int getCurrentRetryCount() {
                return 2;
            }

            @Override
            public void retry(VolleyError error) throws VolleyError {

            }
        });
        queue.add(request);
    }

    @Override
    public boolean insert(Biot biot) {
        return false;
    }
}