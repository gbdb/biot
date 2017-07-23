package com.example.alex.myapplication.parsers;

import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.models.Cycle;

import org.json.JSONException;
import org.json.JSONObject;


public class CycleParser implements BiotEntityParser {
    @Override
    public Biot parse(JSONObject data) throws JSONException {
        return null;
    }

    @Override
    public JSONObject parse(Biot biot) throws JSONException {
        JSONObject json = new JSONObject();
        Cycle cycle = (Cycle)biot;

        json.put("name", cycle.getName());
        json.put("relay", cycle.getRelayId());
        json.put("time_off", String.valueOf(cycle.getTempsOff()));
        json.put("time_on", String.valueOf(cycle.getTempsOn()));
        //json.put("relay_id", "1234");

        return json;
    }
}