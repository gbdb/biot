package com.example.alex.myapplication.communication;

import android.content.Context;

import com.android.volley.RequestQueue;
import com.android.volley.toolbox.Volley;
import com.github.nkzawa.socketio.client.Socket;

import java.util.Map;


public abstract class DAO implements Operation {

    protected Socket socket;
    protected RequestQueue queue;
    protected String apiEndPoint;

    protected String entityName;

    protected Map<String, String> queryParams;

    public DAO(String url, Context context) {
        this.apiEndPoint = "http://" + url;
        socket = ServerCommunication.getInstance().getSocket();

        queue = Volley.newRequestQueue(context);
    }

    public DAO(String url, String entityName, Context context) {
        apiEndPoint = "http://" + url + "/API/" + entityName;
        socket = ServerCommunication.getInstance().getSocket();
        queue = Volley.newRequestQueue(context);
    }
}