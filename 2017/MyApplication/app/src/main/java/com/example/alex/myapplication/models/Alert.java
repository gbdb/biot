package com.example.alex.myapplication.models;

public class Alert extends Biot {

    private String message;

    public Alert(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
