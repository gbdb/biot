package com.example.alex.myapplication.communication;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;
import android.util.Log;
import android.widget.Toast;

import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonArrayRequest;
import com.android.volley.toolbox.Volley;
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


    private ServerCommunication(Context context) {
        String endPoint = "";
        try {
            endPoint = "http://";
            SharedPreferences sharedPref = PreferenceManager.getDefaultSharedPreferences(context);
            String ip = sharedPref.getString("ip_pref", "");
            endPoint += ip;
            socket = IO.socket("http://192.168.43.120:3000");
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

    public void request(final Context context, Map<String,Object> args, final DataCallBack dataCallBack) {
        RequestQueue queue = Volley.newRequestQueue(context);
        String url = (String)args.get("url");
        JsonArrayRequest jsObjRequest = new JsonArrayRequest(url, new Response.Listener<JSONArray>() {
            @Override
            public void onResponse(JSONArray response) {
                dataCallBack.onSuccess(response);
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                dataCallBack.onFailure();
            }
        });
        queue.add(jsObjRequest);
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
                        dataCallBack.onSuccess(temperatureAmbiante + "," + temperatureEau);
                    } catch (JSONException e) {
                        return;
                    }
                }
            });
        }
    }
}