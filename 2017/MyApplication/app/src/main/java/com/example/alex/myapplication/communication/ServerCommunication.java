package com.example.alex.myapplication.communication;

import android.app.Activity;
import android.util.Log;

import com.example.alex.myapplication.util.DataCallBack;
import com.github.nkzawa.emitter.Emitter;
import com.github.nkzawa.socketio.client.IO;
import com.github.nkzawa.socketio.client.Socket;

import org.json.JSONException;
import org.json.JSONObject;
import java.net.URISyntaxException;
import java.util.Map;

public class ServerCommunication {

    private static ServerCommunication serverComm;
    private Socket socket;
    public static String URI;

    private ServerCommunication() {
        try {
            socket = IO.socket(URI);
            //socket.connect();
        } catch (URISyntaxException e) {
        }
    }

    public static ServerCommunication getInstance () {
        if(serverComm == null) {
            Log.i("ServerCommunication", "JE SUIS NUL!");
            serverComm = new ServerCommunication();
            return serverComm;
        }
        else
            return serverComm;
    }

    public Socket getSocket() {
        return socket;
    }

    public void subscribeToNewTemperature(Activity activity, DataCallBack dataCallBack) {
        OnNewTemperatureListener onNewTemperature = new OnNewTemperatureListener(activity, dataCallBack);
        //socket.connect();
        //socket.on("newTemp", onNewTemperature);
        //socket.emit("test,", "");
    }

    public void sendEvent(String message, Map<String,Object> args) {
        JSONObject data = new JSONObject();
        JSONObject argumentsToProvide = new JSONObject();

        try {
            data.put("type", message);
            data.put("args", argumentsToProvide);
            for(Map.Entry<String, Object> entry : args.entrySet())
                argumentsToProvide.put(entry.getKey(), entry.getValue());
        } catch (JSONException e) {
            e.printStackTrace();
        }
        socket.connect();
        socket.emit("event", data);
    }

    public void registerToToastAlerts(Activity activity, DataCallBack dataCallBack) {
        OnNewAlert onNewAlert = new OnNewAlert(activity, dataCallBack);
        //socket.connect();
        //socket.on("event", onNewAlert);
    }

    private class OnNewAlert implements Emitter.Listener {

        private Activity activity;
        private DataCallBack dataCallBack;

        public OnNewAlert(Activity activity, DataCallBack dataCallBack) {
            this.activity = activity;
            this.dataCallBack = dataCallBack;
        }

        @Override
        public void call(final Object... args) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    JSONObject data = (JSONObject) args[0];
                    String message;
                    try {
                        message = data.getString("message");
                        dataCallBack.onSuccess(message, "" );
                    } catch (JSONException e) {
                        return;
                    }
                }
            });
        }
    }

    private class OnNewTemperatureListener implements Emitter.Listener {

        private Activity activity;
        private DataCallBack dataCallBack;

        public OnNewTemperatureListener(Activity activity, DataCallBack dataCallBack) {
            this.activity = activity;
            this.dataCallBack = dataCallBack;
        }

        @Override
        public void call(final Object... args) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    JSONObject data = (JSONObject) args[0];
                    String temperatureAmbiante;
                    String temperatureEau;
                    try {
                        temperatureAmbiante = data.getString("temp1");
                        temperatureEau = data.getString("temp2");
                        dataCallBack.onSuccess(temperatureAmbiante + "," + temperatureEau,"newTemp" );
                    } catch (JSONException e) {
                        return;
                    }
                }
            });
        }
    }
}