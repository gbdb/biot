package com.example.alex.myapplication.parsers;

import android.util.Log;

import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.models.Cycle;
import com.example.alex.myapplication.models.Relay;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;


public class RelayParser implements BiotEntityParser {
    @Override
    public Biot parse(JSONObject data) {
        Biot biot = null;
        try {
            String name = data.getString("name");
            String _id = data.getString("_id");
            boolean status = (boolean)data.get("status");
            JSONObject cycle = (JSONObject)data.get("currentCycle");
            Cycle parsedCycle = new Cycle(cycle.getString("name"),
                    cycle.getInt("off"), cycle.getInt("on"));
            Log.i("Parser", parsedCycle.toString());
            biot = new Relay(name,_id,status, parsedCycle);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return biot;
    }

    @Override
    public JSONObject parse(Biot data) {
        JSONObject jsonObject = new JSONObject();
        Relay relay = (Relay) data;
        try {
            jsonObject.put("name", relay.getCurrentCycleId());
            jsonObject.put("_id", relay.getId());
            jsonObject.put("status", relay.isStatus());
            jsonObject.put("cycle", new CycleParser().parse(relay.getCycle()));
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return jsonObject;
    }
}