package com.example.alex.myapplication.communication;


public interface IRealTimeContentProvider {

    void subscribe(String topic, BiotDataCallback biotDataCallback);
}
