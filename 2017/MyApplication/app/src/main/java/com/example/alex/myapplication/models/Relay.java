package com.example.alex.myapplication.models;


public class Relay extends IOEnty {

    private String name;
    private boolean status;
    private String id;

    public Relay(String name, String id, boolean status) {
        this.name = name;
        this.id = id;
        this.status = status;
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