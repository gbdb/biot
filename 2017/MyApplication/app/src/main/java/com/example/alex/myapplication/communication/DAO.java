package com.example.alex.myapplication.communication;

import android.content.Context;
import android.widget.Toast;

import com.android.volley.RequestQueue;
import com.android.volley.toolbox.Volley;
import com.github.nkzawa.socketio.client.IO;
import com.github.nkzawa.socketio.client.Socket;

import java.net.URISyntaxException;

public abstract class DAO implements Operation {

    protected Socket socket;
    protected RequestQueue queue;
    protected String endPoint;

    public DAO(String url, Context context) {
        this.endPoint = "http://" + url;
        try {
            socket = IO.socket(url);
        } catch (URISyntaxException e) {
            Toast.makeText(context, "Problème de connexion avec le serveur", Toast.LENGTH_SHORT).show();
        }
        queue = Volley.newRequestQueue(context);
    }
}
