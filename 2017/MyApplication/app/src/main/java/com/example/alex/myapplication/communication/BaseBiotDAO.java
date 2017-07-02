package com.example.alex.myapplication.communication;

import android.content.Context;
import android.support.design.widget.Snackbar;
import android.util.Log;

import com.android.volley.AuthFailureError;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.RetryPolicy;
import com.android.volley.TimeoutError;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonArrayRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.parsers.BiotEntityParser;
import com.github.nkzawa.socketio.client.Socket;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class BaseBiotDAO extends DAO {

    private Socket socket;
    protected RequestQueue queue;
    protected String apiEndPoint;

    public BaseBiotDAO(String entityName, Context context) {
        super(context);
        String URI = ServerCommunication.URI;
        apiEndPoint = URI + "/API/" + entityName;
        this.entityName = entityName;
        socket = ServerCommunication.getInstance().getSocket();
        socket.connect();
        queue = Volley.newRequestQueue(context);
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
            public void retry(VolleyError error) throws VolleyError {}
        });
        queue.add(request);
    }

    @Override
    public boolean insert(Biot biot) {
        return false;
    }

    @Override
    public void update(final Biot biot, final BiotEntityParser entityParser){
        String putEndPoint = apiEndPoint + "0/";
        Log.i("BaseBiotDAO", putEndPoint);
        StringRequest putRequest = new StringRequest(Request.Method.PUT, putEndPoint,
                new Response.Listener<String>()
                {
                    @Override
                    public void onResponse(String response) {
                        Log.i("Volley-onResponse", response);
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
                    return entityParser.parse(biot).toString().getBytes();
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                return null;
            }
        };
        queue.add(putRequest);
    }
}