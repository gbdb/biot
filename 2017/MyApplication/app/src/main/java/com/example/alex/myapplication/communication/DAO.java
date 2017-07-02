package com.example.alex.myapplication.communication;

import android.content.Context;

public abstract class DAO implements Operation {


    protected String entityName;
    protected Context context;

    public DAO(Context context) {
        this.context = context;
    }
}