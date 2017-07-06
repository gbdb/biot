package com.example.alex.myapplication.communication.adapters;

import android.app.Activity;

import com.example.alex.myapplication.communication.BiotDataCallback;
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

public class SocketIOLiveDataProviderAdapter implements ILiveDataProviderAdapter {

    private Socket socket;
    private Activity activity;

    private List<Map<String,BiotDataCallback>> subscribers;

    public SocketIOLiveDataProviderAdapter(Activity activity) {
        this.activity = activity;
        try {
            socket = IO.socket("localhost");
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
                    } catch (JSONException e) {
                        return;
                    }
                    broadcast(data, "newTemp");
                }
            });
        }
    };

    private void broadcast(JSONObject jsonObject, String topic) {

        for(Map<String,BiotDataCallback>sub: subscribers){
            if(sub.containsKey(topic))
                sub.get(topic).onDataReceived(jsonObject);
        }
    }
}