package com.example.alex.myapplication.communication;

import android.app.Activity;

import com.example.alex.myapplication.communication.BiotDataCallback;
import com.example.alex.myapplication.communication.ILiveDataProvider;
import com.example.alex.myapplication.communication.ServerURI;
import com.github.nkzawa.emitter.Emitter;
import com.github.nkzawa.socketio.client.IO;
import com.github.nkzawa.socketio.client.Socket;

import org.json.JSONException;
import org.json.JSONObject;

import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SocketIOLiveDataProvider implements ILiveDataProvider {

    private Socket socket;
    private Activity activity;

    private List<Map<String,BiotDataCallback>> subscribers;

    public SocketIOLiveDataProvider(Activity activity) {
        this.activity = activity;
        String URI = ServerURI.URI;
        try {
            socket = IO.socket(URI);
            socket.connect();
        } catch (URISyntaxException e) {
            e.printStackTrace();
        }

        subscribers = new ArrayList<>();
        socket.on("newTemp", temperatureListener);
    }

    @Override
    public void subscribe(String topic, BiotDataCallback biotDataCallback) {
        Map<String,BiotDataCallback> subscription = new HashMap<>();
        subscription.put(topic,biotDataCallback);
        subscribers.add(subscription);
    }

    private final Emitter.Listener temperatureListener = new Emitter.Listener() {
        @Override
        public void call(final Object... args) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    JSONObject data = (JSONObject) args[0];
                    String temp1;
                    String temp2;
                    try {
                        temp1 = data.getString("temp1");
                        temp2 = data.getString("temp2");
                        broadcast(temp1 + "," + temp2, "newTemp");
                    } catch (JSONException e) {
                        return;
                    }

                }
            });
        }
    };

    private void broadcast(String data, String topic) {

        for(Map<String,BiotDataCallback>sub:subscribers){
            if(sub.containsKey(topic))
                sub.get(topic).onDataReceived(data);
        }
    }
}