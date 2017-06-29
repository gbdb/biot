package com.example.alex.myapplication.communication;

import android.content.Context;
import android.util.Log;

import com.android.volley.RequestQueue;
import com.android.volley.toolbox.Volley;
import com.github.nkzawa.socketio.client.Socket;


public abstract class DAO implements Operation {

    protected Socket socket;
    protected RequestQueue queue;
    protected String apiEndPoint;

    protected String entityName;

    public DAO(String url, String entityName, Context context) {
        apiEndPoint = "http://" + url + "/API/" + entityName;
        Log.i("DAO", ServerCommunication.getInstance().getSocket().toString());
        socket = ServerCommunication.getInstance().getSocket();
        socket.connect();
        queue = Volley.newRequestQueue(context);
    }
}