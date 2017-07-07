package com.example.alex.myapplication.communication;


public interface ILiveDataProvider {

    void subscribe(String topic, BiotDataCallback biotDataCallback);
}
