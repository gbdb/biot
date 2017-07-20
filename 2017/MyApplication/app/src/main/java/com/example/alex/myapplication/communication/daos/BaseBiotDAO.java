package com.example.alex.myapplication.communication.daos;

import android.content.Context;
import android.util.Log;

import com.android.volley.AuthFailureError;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.RetryPolicy;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonArrayRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.example.alex.myapplication.communication.BiotDataCallback;
import com.example.alex.myapplication.communication.ServerURI;
import com.example.alex.myapplication.communication.Action;
import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.parsers.BiotEntityParser;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class BaseBiotDAO extends DAO {

    protected RequestQueue queue;
    protected String apiEndPoint;
    protected int method;
    private BiotEntityParser parser;

    public BaseBiotDAO(String entityName, BiotEntityParser parser, Context context) {
        super(context);
        String URI = ServerURI.URI;
        this.parser = parser;
        apiEndPoint = URI + "/API/" + entityName;
        this.entityName = entityName;
        queue = Volley.newRequestQueue(context);
        method = Request.Method.PUT;
    }

    public BaseBiotDAO(Action action, BiotEntityParser parser, Context context) {
        super(context);
        String entity = action.getName();
        String URI = ServerURI.URI;
        this.parser = parser;
        apiEndPoint = URI + entity;
        method = action.getHttpMethod();
        queue = Volley.newRequestQueue(context);
    }

    @Override
    public void fetchAll(final BiotDataCallback biotDataCallback) {
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
            public void retry(VolleyError error) throws VolleyError {}
        });
        queue.add(request);
    }

    @Override
    public void update(final Biot biot, final BiotDataCallback biotDataCallback){
        StringRequest putRequest = new StringRequest(method, apiEndPoint,
                new Response.Listener<String>()
                {
                    @Override
                    public void onResponse(String response) {
                        Log.i("Volley-onResponse", response);
                        biotDataCallback.onDataReceived(response);
                    }
                },
                new Response.ErrorListener()
                {
                    @Override
                    public void onErrorResponse(VolleyError error) {}
                }
        )
        {
            @Override
            public String getBodyContentType() {
                return "application/json";
            }

            @Override
            public byte[] getBody() throws AuthFailureError {
                try {
                    return parser.parse(biot).toString().getBytes();
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                return null;
            }
        };
        queue.add(putRequest);
    }

    @Override
    public boolean create(Biot biot) {
        return false;
    }
}