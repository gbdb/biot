package com.example.alex.myapplication.communication.adapters;

import com.example.alex.myapplication.communication.BiotDataCallback;

public interface ILiveDataProviderAdapter {

    void subscribe(String topic, BiotDataCallback biotDataCallback);
}
