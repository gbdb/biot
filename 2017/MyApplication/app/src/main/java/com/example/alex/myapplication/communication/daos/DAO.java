package com.example.alex.myapplication.communication.daos;

import android.content.Context;

import com.example.alex.myapplication.communication.Operation;

public abstract class DAO implements Operation {


    protected String entityName;
    protected Context context;

    public DAO(Context context) {
        this.context = context;
    }
}