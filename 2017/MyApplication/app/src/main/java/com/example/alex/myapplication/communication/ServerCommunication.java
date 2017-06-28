package com.example.alex.myapplication.communication;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonArrayRequest;
import com.android.volley.toolbox.Volley;
import com.example.alex.myapplication.R;
import com.example.alex.myapplication.util.DataCallBack;
import com.github.nkzawa.emitter.Emitter;
import com.github.nkzawa.socketio.client.IO;
import com.github.nkzawa.socketio.client.Socket;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.net.URISyntaxException;
import java.util.Map;

public class ServerCommunication {

    private static ServerCommunication serverComm;
    private Socket socket;
    public static String URI;

    private ServerCommunication(Context context) {
        String endPoint = "";
        try {
            endPoint = "http://";
            SharedPreferences sharedPref = PreferenceManager.getDefaultSharedPreferences(context);
            String ip = sharedPref.getString("ip_pref", context.getString(R.string.default_ip));
            endPoint += ip;
            socket = IO.socket(endPoint);
        } catch (URISyntaxException e) {

        }
    }

    private ServerCommunication() {
        try {
            socket = IO.socket(URI);
        } catch (URISyntaxException e) {
        }
    }

    public static ServerCommunication getInstance (Context context) {
        if(serverComm == null) {
            return new ServerCommunication(context);
        }
        else{
            return serverComm;
        }
    }

    public static ServerCommunication getInstance () {
        if(serverComm == null) {
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
        socket.connect();
        socket.on("newTemp", onNewTemperature);
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
        socket.connect();
        socket.on("event", onNewAlert);
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