package com.example.alex.myapplication.models;


public class Pump {

    private String name;
    private boolean status;
    private String id;

    public Pump(String name, String id) {
        this.name = name;
        this.id = id;
    }

    public boolean isStatus() {
        return status;
    }

    public void setStatus(boolean status) {
        this.status = status;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }
}