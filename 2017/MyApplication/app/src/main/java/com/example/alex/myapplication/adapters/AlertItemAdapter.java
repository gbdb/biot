package com.example.alex.myapplication.adapters;

import android.content.Context;
import android.support.v7.widget.CardView;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.models.Alert;

import java.util.List;


public class AlertItemAdapter extends RecyclerView.Adapter<AlertItemAdapter.ViewHolder> {

    private List<Alert> alerts;

    public AlertItemAdapter(List<Alert> alerts) {
        this.alerts = alerts;
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        public TextView textView;
        public CardView cardView;
        public ViewHolder(View item) {
            super(item);
            cardView = (CardView)item.findViewById(R.id.card_view1);
            textView = (TextView)item.findViewById(R.id.label_alert_item);
        }
    }

    @Override
    public AlertItemAdapter.ViewHolder onCreateViewHolder(ViewGroup parent,
                                                          int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.alert_item, parent, false);
        ViewHolder viewHolder = new ViewHolder(v);
        return viewHolder;
    }

    @Override
    public void onBindViewHolder(ViewHolder holder, int position) {
        holder.textView.setText(alerts.get(position).getMessage());
    }

    @Override
    public int getItemCount() {
        return alerts.size();
    }

    @Override
    public void onAttachedToRecyclerView(RecyclerView recyclerView) {
        super.onAttachedToRecyclerView(recyclerView);
    }
}